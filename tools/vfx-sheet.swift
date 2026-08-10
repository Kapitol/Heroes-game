// Bakes a video effect into a sprite sheet the game can already read.
//
//   swiftc -O tools/vfx-sheet.swift -o /tmp/vfx-sheet
//   /tmp/vfx-sheet in.mov art/vfx-cast.png 16 4 160
//
// The clips arrive as Apple ProRes 4444, which is the good news and the bad
// news in one line: 4444 carries a real alpha channel, so these effects have
// proper transparency and none of the screen-blending guesswork a black-matte
// clip would need — and no browser will decode ProRes, so the trick used for
// the audio (hand it to headless Chrome, which decodes anything it can play)
// does not work here.
//
// AVFoundation will, and it is already on the machine. `AVAssetReader` with a
// 32-bit BGRA output preserves the alpha; `AVAssetImageGenerator`, the shorter
// route, composites onto black and would throw it away.
//
// Frames are laid out left to right, top to bottom, every cell the same size,
// which is what `sliceGrid` in js/atlas.js expects.

import AVFoundation
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count >= 4 else {
    FileHandle.standardError.write("usage: vfx-sheet <in.mov> <out.png> <frames> [cols] [cell]\n".data(using: .utf8)!)
    exit(1)
}
let inURL = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])
let want = Int(args[3]) ?? 16
let cols = args.count > 4 ? (Int(args[4]) ?? 4) : 4
let cell = args.count > 5 ? (Int(args[5]) ?? 160) : 160

let asset = AVURLAsset(url: inURL)
guard let track = asset.tracks(withMediaType: .video).first else {
    FileHandle.standardError.write("no video track\n".data(using: .utf8)!)
    exit(1)
}

let reader = try AVAssetReader(asset: asset)
let output = AVAssetReaderTrackOutput(track: track, outputSettings: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
])
output.alwaysCopiesSampleData = true
reader.add(output)
reader.startReading()

// Every frame is decoded and then thinned, rather than seeking to `want`
// timestamps. Seeking a long-GOP file lands on the nearest keyframe and
// silently repeats frames; reading straight through is both exact and faster
// than a seek per frame.
// **Frames are thinned and shrunk as they are read, not after.** A 66-second
// 2560x1440 clip is roughly sixteen hundred frames at 14MB each: decoding it
// whole to pick sixteen would ask for gigabytes. The stride keeps a few times
// more than are wanted — enough that the pick is still spread evenly over the
// clip — and each keeper is copied at a size no larger than the sheet will
// ever need.
let fps = Double(track.nominalFrameRate) > 0.1 ? Double(track.nominalFrameRate) : 30
let estimate = max(1, Int(CMTimeGetSeconds(asset.duration) * fps))
let stride = max(1, estimate / max(1, want * 3))
let maxSide = max(512, cell * 2)

var frames: [CGImage] = []
var index = -1
let ctxColor = CGColorSpace(name: CGColorSpace.sRGB)!
while let sample = output.copyNextSampleBuffer() {
    index += 1
    if index % stride != 0 { continue }
    guard let pixels = CMSampleBufferGetImageBuffer(sample) else { continue }
    CVPixelBufferLockBaseAddress(pixels, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(pixels, .readOnly) }
    let w = CVPixelBufferGetWidth(pixels)
    let h = CVPixelBufferGetHeight(pixels)
    let stride = CVPixelBufferGetBytesPerRow(pixels)
    guard let base = CVPixelBufferGetBaseAddress(pixels) else { continue }
    // `premultipliedFirst` with `byteOrder32Little` is BGRA in memory, which is
    // what was asked for above. Getting this pair wrong shows up as an effect
    // with its red and blue swapped rather than as an error.
    guard let ctx = CGContext(data: base, width: w, height: h, bitsPerComponent: 8,
                              bytesPerRow: stride, space: ctxColor,
                              bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue
                                  | CGBitmapInfo.byteOrder32Little.rawValue),
          let borrowed = ctx.makeImage() else { continue }

    // **The frame is copied into memory this program owns.** `makeImage` over a
    // locked pixel buffer can return an image that still references the
    // decoder's memory, and that memory is recycled the moment the buffer is
    // unlocked and released. Drawing such a frame straight into the sheet
    // happened to survive; reading its pixels back — which cropping has to do —
    // did not, and the process was killed with no diagnostic at all.
    let shrink = min(1.0, Double(maxSide) / Double(max(w, h)))
    let ow = max(1, Int(Double(w) * shrink))
    let oh = max(1, Int(Double(h) * shrink))
    guard let own = CGContext(data: nil, width: ow, height: oh, bitsPerComponent: 8,
                              bytesPerRow: 0, space: ctxColor,
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { continue }
    own.interpolationQuality = .high
    own.clear(CGRect(x: 0, y: 0, width: ow, height: oh))
    own.draw(borrowed, in: CGRect(x: 0, y: 0, width: ow, height: oh))
    guard let image = own.makeImage() else { continue }
    frames.append(image)
}

FileHandle.standardError.write("decoded \(frames.count) frames\n".data(using: .utf8)!)
guard !frames.isEmpty else {
    FileHandle.standardError.write("decoded no frames\n".data(using: .utf8)!)
    exit(1)
}

// **Trimmed to where something happens.** A stock clip is often one burst
// inside fifteen seconds of black, and sampling evenly across the whole thing
// spends most of the sheet on nothing — the first bake of the sparkle put the
// effect in five cells and black in eleven. Frames with no content at either
// end are dropped before the pick.
let live = frames.enumerated().filter { alphaBounds($0.element) != nil }.map { $0.offset }
let lo = live.first ?? 0
let hi = live.last ?? (frames.count - 1)
if lo > 0 || hi < frames.count - 1 {
    print("  trimmed to frames \(lo)…\(hi) of \(frames.count)")
}
let active = Array(frames[lo...hi])

let take = min(want, active.count)
let picked = (0..<take).map { active[Int(Double($0) * Double(active.count) / Double(take))] }

// --- crop to what is actually lit -----------------------------------------
//
// These clips are composed for video: a 720x720 frame with the effect small
// and centred in it, surrounded by nothing. Scaled straight into a 160px cell
// that leaves the effect itself about 25 pixels across — a smudge — while most
// of the sheet stores empty alpha.
//
// The box is the *union* across every frame, never per-frame. A per-frame crop
// would re-centre and re-scale the effect on each cell, so a bolt that grows
// and fades would instead pulse and jump: the animation would be in the
// cropping rather than in the footage.
// The buffer is allocated explicitly rather than taken as `&array`. An inout
// pointer into a Swift array is only guaranteed for the duration of the call it
// is passed to, and `CGContext` keeps the pointer and writes to it later — so
// the array version crashed on the first draw, silently, with a killed process
// and no diagnostic.
func alphaBounds(_ img: CGImage) -> CGRect? {
    let w = img.width, h = img.height
    let bytes = UnsafeMutablePointer<UInt8>.allocate(capacity: w * h * 4)
    bytes.initialize(repeating: 0, count: w * h * 4)
    defer { bytes.deallocate() }
    guard let ctx = CGContext(data: bytes, width: w, height: h, bitsPerComponent: 8,
                              bytesPerRow: w * 4, space: ctxColor,
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
    ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
    var minX = w, minY = h, maxX = -1, maxY = -1
    for y in 0..<h {
        for x in 0..<w where bytes[(y * w + x) * 4 + 3] > 8 {
            if x < minX { minX = x }
            if x > maxX { maxX = x }
            if y < minY { minY = y }
            if y > maxY { maxY = y }
        }
    }
    // **A fully opaque frame is a black matte, not a full-frame effect.** Half
    // these clips ship as H.264, which has no alpha at all, so the effect is
    // painted on black and every pixel reads as present. Bounding those by
    // alpha returns the whole frame and the bake letterboxes a small effect
    // inside a large empty cell. Where alpha says everything, luminance is
    // asked instead, and near-black counts as nothing — which is exactly what
    // it will contribute once the sheet is blended additively.
    let opaque = maxX - minX + 1 >= w && maxY - minY + 1 >= h
    if opaque {
        minX = w; minY = h; maxX = -1; maxY = -1
        for y in 0..<h {
            for x in 0..<w {
                let i = (y * w + x) * 4
                // Rec. 601 weights, in eighths, on premultiplied RGBA.
                let lum = (Int(bytes[i]) * 2 + Int(bytes[i + 1]) * 5 + Int(bytes[i + 2])) / 8
                if lum < 12 { continue }
                if x < minX { minX = x }
                if x > maxX { maxX = x }
                if y < minY { minY = y }
                if y > maxY { maxY = y }
            }
        }
    }
    if maxX < 0 { return nil }
    return CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)
}

var box: CGRect? = nil
for img in picked {
    guard let b = alphaBounds(img) else { continue }
    box = box.map { $0.union(b) } ?? b
}
let cropped: [CGImage]
if var b = box, b.width > 4, b.height > 4 {
    // A little air, so a glow that fades to nothing at the edge is not clipped
    // square where it meets the cell.
    b = b.insetBy(dx: -b.width * 0.04, dy: -b.height * 0.04)
    let full = CGRect(x: 0, y: 0, width: picked[0].width, height: picked[0].height)
    let clip = b.intersection(full).integral
    cropped = picked.compactMap { $0.cropping(to: clip) }
    print("  cropped to \(Int(clip.width))x\(Int(clip.height)) of \(picked[0].width)x\(picked[0].height)")
} else {
    cropped = picked
}

let rows = Int(ceil(Double(take) / Double(cols)))
let sheetW = cols * cell
let sheetH = rows * cell
guard let sheet = CGContext(data: nil, width: sheetW, height: sheetH, bitsPerComponent: 8,
                            bytesPerRow: 0, space: ctxColor,
                            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else {
    FileHandle.standardError.write("could not make the sheet\n".data(using: .utf8)!)
    exit(1)
}
sheet.clear(CGRect(x: 0, y: 0, width: sheetW, height: sheetH))
sheet.interpolationQuality = .high

for (i, img) in cropped.enumerated() {
    let cx = i % cols
    // CoreGraphics counts y from the bottom and `sliceGrid` reads top to
    // bottom, so the row is flipped here rather than in the game.
    let cy = rows - 1 - (i / cols)
    // Fitted inside the cell, aspect kept: these clips are 16:9 and square by
    // turns, and a stretched lightning bolt reads as a different effect.
    let scale = min(Double(cell) / Double(img.width), Double(cell) / Double(img.height))
    let w = Double(img.width) * scale
    let h = Double(img.height) * scale
    sheet.draw(img, in: CGRect(x: Double(cx * cell) + (Double(cell) - w) / 2,
                               y: Double(cy * cell) + (Double(cell) - h) / 2,
                               width: w, height: h))
}

guard let out = sheet.makeImage(),
      let dest = CGImageDestinationCreateWithURL(outURL as CFURL, UTType.png.identifier as CFString, 1, nil) else {
    FileHandle.standardError.write("could not write the png\n".data(using: .utf8)!)
    exit(1)
}
CGImageDestinationAddImage(dest, out, nil)
CGImageDestinationFinalize(dest)
print("\(outURL.lastPathComponent)  \(take) frames from \(frames.count), \(cols)x\(rows) of \(cell)px")

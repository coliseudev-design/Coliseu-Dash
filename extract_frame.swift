import AVFoundation
import CoreGraphics
import ImageIO

let input = URL(fileURLWithPath: "/Users/kleber/Documents/Propaganda/Arena/Campanha-Coliseu-agora-tem-Arena/ARENA-reel-entre-na-arena.mp4")
let asset = AVAsset(url: input)
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
let times = [0.0, 3.0, 7.5, 12.0]
for t in times {
  let cg = try gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 600), actualTime: nil)
  let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: "/tmp/arena-\(Int(t)).png") as CFURL, "public.png" as CFString, 1, nil)!
  CGImageDestinationAddImage(dest, cg, nil); CGImageDestinationFinalize(dest)
}

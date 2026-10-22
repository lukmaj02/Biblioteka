import AppKit
import Foundation

let size: CGFloat = 1024
let emoji = "📚"
let image = NSImage(size: NSSize(width: size, height: size))
image.lockFocus()

// Tło — papierowy beż jak w aplikacji
let bg = NSColor(calibratedRed: 0.953, green: 0.922, blue: 0.878, alpha: 1)
bg.setFill()
NSBezierPath(
  roundedRect: NSRect(x: 0, y: 0, width: size, height: size),
  xRadius: size * 0.18,
  yRadius: size * 0.18
).fill()

let font = NSFont.systemFont(ofSize: size * 0.62)
let attrs: [NSAttributedString.Key: Any] = [
  .font: font,
]
let str = NSString(string: emoji)
let textSize = str.size(withAttributes: attrs)
let point = NSPoint(
  x: (size - textSize.width) / 2,
  y: (size - textSize.height) / 2 - size * 0.03
)
str.draw(at: point, withAttributes: attrs)
image.unlockFocus()

guard let tiff = image.tiffRepresentation,
      let rep = NSBitmapImageRep(data: tiff),
      let png = rep.representation(using: .png, properties: [:]) else {
  fputs("Nie udało się wygenerować PNG\n", stderr)
  exit(1)
}

let outDir = CommandLine.arguments.count > 1
  ? CommandLine.arguments[1]
  : "build"
try FileManager.default.createDirectory(
  atPath: outDir,
  withIntermediateDirectories: true
)
let outPath = (outDir as NSString).appendingPathComponent("icon.png")
try png.write(to: URL(fileURLWithPath: outPath))
print("Zapisano \(outPath)")

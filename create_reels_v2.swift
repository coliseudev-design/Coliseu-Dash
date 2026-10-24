import AVFoundation
import CoreGraphics
import CoreText
import ImageIO

let outDir = "/Users/kleber/Documents/GitHub/Coliseu-Dash/reels-coliseubi"
let logoPath = "/Users/kleber/Documents/Propaganda/LOGOS/Logo01-1.png"
try FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
let logo = CGImageSourceCreateWithURL(URL(fileURLWithPath: logoPath) as CFURL, nil).flatMap { CGImageSourceCreateImageAtIndex($0, 0, nil) }

struct Reel { let file: String; let eyebrow: String; let title: String; let subtitle: String; let screen: Int; let accent: CGColor }
let reels = [
  Reel(file: "01-visao-estrategica.mp4", eyebrow: "COLISEUBI", title: "Decisões mais inteligentes.", subtitle: "Sua operação em uma visão executiva.", screen: 0, accent: CGColor(red: 0.00, green: 0.55, blue: 0.82, alpha: 1)),
  Reel(file: "02-equipes-rankings.mp4", eyebrow: "COLISEUBI", title: "Performance que aparece.", subtitle: "Metas, equipes e rankings em tempo real.", screen: 1, accent: CGColor(red: 0.00, green: 0.62, blue: 0.82, alpha: 1)),
  Reel(file: "03-financeiro.mp4", eyebrow: "COLISEUBI", title: "Controle financeiro de verdade.", subtitle: "Tudo que importa, na palma da mão.", screen: 2, accent: CGColor(red: 0.00, green: 0.55, blue: 0.82, alpha: 1))
]
let W = 1080, H = 1920, FPS = 30, N = 450
let white = CGColor(red: 0.96, green: 0.98, blue: 1, alpha: 1)
let muted = CGColor(red: 0.58, green: 0.65, blue: 0.73, alpha: 1)
let surface = CGColor(red: 0.07, green: 0.10, blue: 0.16, alpha: 1)
let border = CGColor(red: 0.12, green: 0.17, blue: 0.24, alpha: 1)

func text(_ c: CGContext, _ s: String, _ size: CGFloat, _ color: CGColor, _ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ center: Bool = false) {
  let f = CTFontCreateWithName("Helvetica-Bold" as CFString, size, nil)
  let a: [NSAttributedString.Key: Any] = [NSAttributedString.Key(kCTFontAttributeName as String): f, NSAttributedString.Key(kCTForegroundColorAttributeName as String): color]
  let line = CTLineCreateWithAttributedString(NSAttributedString(string: s, attributes: a)); let b = CTLineGetBoundsWithOptions(line, [])
  c.textPosition = CGPoint(x: center ? x + (w - b.width)/2 : x, y: y); CTLineDraw(line, c)
}
func round(_ c: CGContext, _ r: CGRect, _ fill: CGColor, _ radius: CGFloat = 24, _ stroke: CGColor? = nil) {
  c.setFillColor(fill); c.addPath(CGPath(roundedRect: r, cornerWidth: radius, cornerHeight: radius, transform: nil)); c.fillPath()
  if let stroke { c.setStrokeColor(stroke); c.setLineWidth(2); c.addPath(CGPath(roundedRect: r, cornerWidth: radius, cornerHeight: radius, transform: nil)); c.strokePath() }
}
func metric(_ c: CGContext, _ x: CGFloat, _ y: CGFloat, _ title: String, _ value: String, _ color: CGColor) {
  round(c, CGRect(x:x,y:y,width:390,height:116), surface, 18, border); text(c,title,15,muted,x+20,y+75,350); text(c,value,28,white,x+20,y+30,350); c.setFillColor(color); c.fillEllipse(in:CGRect(x:x+350,y:y+82,width:10,height:10))
}
func drawPhone(_ c: CGContext, _ r: Reel, _ progress: CGFloat) {
  let px: CGFloat = 105, py: CGFloat = 360 + min(55, progress * 55), pw: CGFloat = 870, ph: CGFloat = 1170
  c.setShadow(offset: CGSize(width:0,height:-18), blur: 32, color: CGColor(red:0,green:0,blue:0,alpha:0.45)); round(c, CGRect(x:px,y:py,width:pw,height:ph), CGColor(red:0.02,green:0.03,blue:0.05,alpha:1), 55, CGColor(red:0.20,green:0.28,blue:0.38,alpha:1)); c.setShadow(offset:.zero,blur:0,color:nil)
  round(c, CGRect(x:px+22,y:py+22,width:pw-44,height:ph-44), CGColor(red:0.035,green:0.05,blue:0.085,alpha:1), 40)
  round(c, CGRect(x:px+330,y:py+ph-38,width:210,height:12), CGColor(red:0.25,green:0.3,blue:0.38,alpha:1), 8)
  text(c,"Coliseu",23,white,px+55,py+ph-110,300); text(c,"BI",23,r.accent,px+180,py+ph-110,80); text(c,"TEMPO REAL",11,CGColor(red:0.1,green:0.8,blue:0.55,alpha:1),px+pw-190,py+ph-108,130)
  text(c,["Visão Executiva","Equipes","Financeiro"][r.screen],20,white,px+55,py+ph-175,pw-110)
  if r.screen == 0 { metric(c,px+45,py+ph-350,"Faturamento Líquido","R$ 248.650,00",r.accent); metric(c,px+45,py+ph-490,"Ticket Médio","R$ 1.842,00",CGColor(red:0.96,green:0.62,blue:0.04,alpha:1)); metric(c,px+435,py+ph-490,"Total de Vendas","1.284",CGColor(red:0.06,green:0.72,blue:0.52,alpha:1)); text(c,"Meta do Mês",16,white,px+55,py+ph-585,pw-110); c.setFillColor(border); c.fill(CGRect(x:px+55,y:py+ph-635,width:pw-110,height:18)); c.setFillColor(r.accent); c.fill(CGRect(x:px+55,y:py+ph-635,width:620,height:18)); text(c,"78% atingido",14,muted,px+55,py+ph-685,pw-110) }
  if r.screen == 1 { text(c,"Ranking de Vendedores",18,white,px+55,py+ph-350,pw-110); for (i,n) in ["Ana Paula","Carlos Mendes","Mariana Souza"].enumerated() { let yy=py+ph-470-CGFloat(i)*150; round(c,CGRect(x:px+45,y:yy,width:pw-90,height:112),surface,18,border); text(c,"0\(i+1)",26,r.accent,px+70,yy+38,60); text(c,n,17,white,px+150,yy+66,300); text(c,["R$ 82.400","R$ 64.200","R$ 51.890"][i],17,muted,px+150,yy+32,300); c.setFillColor(r.accent); c.fill(CGRect(x:px+550,y:yy+42,width:190-CGFloat(i)*35,height:12)) } }
  if r.screen == 2 { metric(c,px+45,py+ph-350,"Saldo Consolidado","R$ 386.920,00",r.accent); metric(c,px+45,py+ph-490,"Entradas / Receber","R$ 92.480,00",CGColor(red:0.06,green:0.72,blue:0.52,alpha:1)); metric(c,px+435,py+ph-490,"Saídas / Pagar","R$ 38.740,00",CGColor(red:0.94,green:0.26,blue:0.26,alpha:1)); text(c,"Fluxo operacional",16,white,px+55,py+ph-585,pw-110); for i in 0..<6 { c.setFillColor(i == 4 ? r.accent : border); c.fill(CGRect(x:px+75+CGFloat(i)*110,y:py+ph-820,width:48,height:CGFloat(55+i*17))) } }
}

for r in reels {
  let url = URL(fileURLWithPath: outDir).appendingPathComponent(r.file); try? FileManager.default.removeItem(at:url)
  let writer = try AVAssetWriter(outputURL:url,fileType:.mp4); let settings:[String:Any] = [AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:W,AVVideoHeightKey:H,AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:7_000_000]]
  let input = AVAssetWriterInput(mediaType:.video,outputSettings:settings); let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32ARGB,kCVPixelBufferWidthKey as String:W,kCVPixelBufferHeightKey as String:H]); writer.add(input); writer.startWriting(); writer.startSession(atSourceTime:.zero)
  for i in 0..<N { while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval:0.002) }; var p:CVPixelBuffer?; CVPixelBufferCreate(kCFAllocatorDefault,W,H,kCVPixelFormatType_32ARGB,nil,&p); let b=p!; CVPixelBufferLockBaseAddress(b,[]); let c=CGContext(data:CVPixelBufferGetBaseAddress(b),width:W,height:H,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(b),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipFirst.rawValue)!; c.setFillColor(CGColor(red:0.025,green:0.045,blue:0.08,alpha:1)); c.fill(CGRect(x:0,y:0,width:W,height:H)); let t=CGFloat(i)/CGFloat(N); c.setFillColor(r.accent.copy(alpha:0.12)!); c.fillEllipse(in:CGRect(x:-200+t*300,y:1180,width:850,height:850)); c.setFillColor(CGColor(red:0.06,green:0.12,blue:0.20,alpha:1)); c.fill(CGRect(x:0,y:0,width:W,height:18)); if let logo { c.draw(logo,in:CGRect(x:72,y:1700,width:310,height:87)) }; text(c,r.eyebrow,19,r.accent,72,1580,900); text(c,r.title,58,white,72,1480,900); text(c,r.subtitle,28,muted,72,1410,900); drawPhone(c,r,t); c.setFillColor(r.accent); c.fill(CGRect(x:72,y:125,width:min(500,CGFloat(i)*4),height:8)); CVPixelBufferUnlockBaseAddress(b,[]); adaptor.append(b,withPresentationTime:CMTime(value:CMTimeValue(i),timescale:CMTimeScale(FPS))) }
  input.markAsFinished(); writer.finishWriting{}; while writer.status == .writing { Thread.sleep(forTimeInterval:0.05) }; print("created \(url.path)")
}

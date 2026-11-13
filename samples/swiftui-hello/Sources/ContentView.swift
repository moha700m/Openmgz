import SwiftUI

struct ContentView: View {
    @State private var taps = 0

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "iphone.gen3")
                .font(.system(size: 54, weight: .thin))
                .foregroundStyle(.tint)

            Text("Openmgz")
                .font(.largeTitle.bold())

            Text("This SwiftUI app was uploaded as an archive, analyzed as a native Xcode project, and built into an unsigned IPA on a macOS runner.")
                .font(.footnote)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 28)

            Button("Tapped \(taps) times") { taps += 1 }
                .buttonStyle(.borderedProminent)
                .padding(.top, 6)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}

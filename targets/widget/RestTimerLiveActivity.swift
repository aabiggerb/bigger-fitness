import ActivityKit
import SwiftUI
import WidgetKit

// MARK: - Brand colors (mirror src/theme/themes.ts dark theme)
private extension Color {
  static let brandAccent = Color(red: 1.0, green: 0.84, blue: 0.0) // #FFD600 yellow
  static let brandBg = Color(red: 0.04, green: 0.10, blue: 0.06) // #0A1A0F deep green
  static let brandCard = Color(red: 0.07, green: 0.16, blue: 0.10) // #122A1A
  static let brandMuted = Color(red: 0.55, green: 0.65, blue: 0.55)
  static let brandDanger = Color(red: 1.0, green: 0.27, blue: 0.27) // #FF4444
}

// MARK: - Live Activity definition
struct RestTimerLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: RestTimerAttributes.self) { context in
      // ─── Lock screen / banner UI ─────────────────────────────
      LockScreenView(context: context)
        .activityBackgroundTint(Color.brandBg)
        .activitySystemActionForegroundColor(Color.brandAccent)
    } dynamicIsland: { context in
      DynamicIsland {
        // ─── Expanded ───────────────────────────────────────────
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 6) {
            Image(systemName: "figure.strengthtraining.traditional")
              .foregroundColor(.brandAccent)
            Text(context.attributes.athleteName)
              .font(.system(size: 13, weight: .semibold))
              .foregroundColor(.white)
              .lineLimit(1)
          }
          .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          countdownText(state: context.state, attrs: context.attributes,
                        size: 22, weight: .heavy, color: timerColor(context.state))
            .padding(.trailing, 4)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 6) {
            Text(subtitle(for: context.state))
              .font(.system(size: 11, weight: .semibold))
              .foregroundColor(.brandMuted)
              .textCase(.uppercase)
            ProgressView(
              timerInterval: context.state.startedAt...context.state.endsAt,
              countsDown: false,
              label: { EmptyView() },
              currentValueLabel: { EmptyView() }
            )
            .tint(timerColor(context.state))
          }
          .padding(.horizontal, 4)
        }
      } compactLeading: {
        Image(systemName: "timer")
          .foregroundColor(.brandAccent)
      } compactTrailing: {
        countdownText(state: context.state, attrs: context.attributes,
                      size: 14, weight: .bold, color: timerColor(context.state))
          .frame(minWidth: 44)
      } minimal: {
        Image(systemName: "timer")
          .foregroundColor(.brandAccent)
      }
      .keylineTint(Color.brandAccent)
    }
  }

  // MARK: - Helpers
  private func timerColor(_ state: RestTimerAttributes.ContentState) -> Color {
    if state.isFinished { return .brandDanger }
    if state.isPaused { return .brandMuted }
    return .brandAccent
  }

  private func subtitle(for state: RestTimerAttributes.ContentState) -> String {
    if state.isFinished { return "¡Listo!" }
    if state.isPaused { return "En pausa" }
    return "Descanso"
  }

  /// Renders either an auto-counting timer (Text(timerInterval:)), a frozen
  /// formatted time (when paused), or "00:00" (when finished).
  @ViewBuilder
  private func countdownText(
    state: RestTimerAttributes.ContentState,
    attrs: RestTimerAttributes,
    size: CGFloat,
    weight: Font.Weight,
    color: Color
  ) -> some View {
    if state.isFinished {
      Text("00:00")
        .font(.system(size: size, weight: weight, design: .rounded))
        .monospacedDigit()
        .foregroundColor(color)
    } else if state.isPaused {
      Text(formatted(seconds: state.pausedRemainingSec))
        .font(.system(size: size, weight: weight, design: .rounded))
        .monospacedDigit()
        .foregroundColor(color)
    } else {
      Text(timerInterval: Date()...state.endsAt, countsDown: true)
        .font(.system(size: size, weight: weight, design: .rounded))
        .monospacedDigit()
        .foregroundColor(color)
        .multilineTextAlignment(.trailing)
    }
  }

  private func formatted(seconds: Int) -> String {
    let m = seconds / 60
    let s = seconds % 60
    return String(format: "%02d:%02d", m, s)
  }
}

// MARK: - Lock screen / banner
private struct LockScreenView: View {
  let context: ActivityViewContext<RestTimerAttributes>

  var body: some View {
    HStack(alignment: .center, spacing: 14) {
      // Left: athlete + status
      VStack(alignment: .leading, spacing: 4) {
        HStack(spacing: 6) {
          Image(systemName: "figure.strengthtraining.traditional")
            .foregroundColor(.brandAccent)
          Text(context.attributes.athleteName)
            .font(.system(size: 15, weight: .bold))
            .foregroundColor(.white)
            .lineLimit(1)
        }
        Text(subtitle)
          .font(.system(size: 11, weight: .semibold))
          .foregroundColor(.brandMuted)
          .textCase(.uppercase)
        ProgressView(
          timerInterval: context.state.startedAt...context.state.endsAt,
          countsDown: false,
          label: { EmptyView() },
          currentValueLabel: { EmptyView() }
        )
        .tint(barColor)
        .padding(.top, 2)
      }
      Spacer(minLength: 8)
      // Right: big countdown
      countdown
    }
    .padding(14)
  }

  @ViewBuilder
  private var countdown: some View {
    if context.state.isFinished {
      Text("¡LISTO!")
        .font(.system(size: 22, weight: .heavy, design: .rounded))
        .foregroundColor(.brandDanger)
    } else if context.state.isPaused {
      Text(formatted(seconds: context.state.pausedRemainingSec))
        .font(.system(size: 32, weight: .heavy, design: .rounded))
        .monospacedDigit()
        .foregroundColor(.brandMuted)
    } else {
      Text(timerInterval: Date()...context.state.endsAt, countsDown: true)
        .font(.system(size: 32, weight: .heavy, design: .rounded))
        .monospacedDigit()
        .foregroundColor(.brandAccent)
        .multilineTextAlignment(.trailing)
    }
  }

  private var subtitle: String {
    if context.state.isFinished { return "Tiempo cumplido" }
    if context.state.isPaused { return "En pausa" }
    return "Cronómetro de descanso"
  }

  private var barColor: Color {
    if context.state.isFinished { return .brandDanger }
    if context.state.isPaused { return .brandMuted }
    return .brandAccent
  }

  private func formatted(seconds: Int) -> String {
    let m = seconds / 60
    let s = seconds % 60
    return String(format: "%02d:%02d", m, s)
  }
}

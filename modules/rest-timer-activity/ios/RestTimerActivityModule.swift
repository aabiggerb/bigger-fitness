import ActivityKit
import ExpoModulesCore
import Foundation

@available(iOS 16.2, *)
public class RestTimerActivityModule: Module {
  // Track current activity ID so updates/end target the right one
  private static var currentActivityID: String?

  public func definition() -> ModuleDefinition {
    Name("RestTimerActivityModule")

    Function("areLiveActivitiesEnabled") { () -> Bool in
      return ActivityAuthorizationInfo().areActivitiesEnabled
    }

    AsyncFunction("startActivity") { (args: [String: Any], promise: Promise) in
      let enabled = ActivityAuthorizationInfo().areActivitiesEnabled
      NSLog("[BiggerFitness][LiveActivity] startActivity called. authEnabled=%@ args=%@", enabled ? "YES" : "NO", args)
      guard enabled else {
        NSLog("[BiggerFitness][LiveActivity] aborting: Live Activities NOT enabled by user/system")
        promise.resolve(NSNull())
        return
      }
      let athleteName = (args["athleteName"] as? String) ?? "Atleta"
      let totalSec = (args["totalSec"] as? Int) ?? 90
      let remainingSec = (args["remainingSec"] as? Int) ?? totalSec

      // End any existing activity first (one timer at a time in the island)
      Task {
        await Self.endAllActivities(dismiss: true)

        let now = Date()
        let endsAt = now.addingTimeInterval(TimeInterval(remainingSec))
        let attributes = RestTimerAttributes(athleteName: athleteName, totalSec: totalSec)
        let state = RestTimerAttributes.ContentState(
          endsAt: endsAt,
          startedAt: now,
          isFinished: false,
          isPaused: false,
          pausedRemainingSec: remainingSec
        )
        do {
          if #available(iOS 16.2, *) {
            let activity = try Activity.request(
              attributes: attributes,
              content: ActivityContent(state: state, staleDate: endsAt.addingTimeInterval(60)),
              pushType: nil
            )
            Self.currentActivityID = activity.id
            NSLog("[BiggerFitness][LiveActivity] Activity.request OK id=%@", activity.id)
            promise.resolve(activity.id)
          } else {
            NSLog("[BiggerFitness][LiveActivity] iOS < 16.2, cannot start")
            promise.resolve(NSNull())
          }
        } catch {
          NSLog("[BiggerFitness][LiveActivity] Activity.request FAILED: %@", String(describing: error))
          promise.reject("E_ACTIVITY_REQUEST", "Activity.request failed: \(error.localizedDescription)")
        }
      }
    }

    AsyncFunction("updateActivity") { (args: [String: Any], promise: Promise) in
      Task {
        guard let id = Self.currentActivityID,
              let activity = Activity<RestTimerAttributes>.activities.first(where: { $0.id == id })
        else {
          promise.resolve(nil)
          return
        }

        let prev = activity.content.state
        let isPaused = (args["isPaused"] as? Bool) ?? prev.isPaused
        let isFinished = (args["isFinished"] as? Bool) ?? prev.isFinished
        let remainingSecOpt = args["remainingSec"] as? Int
        let totalSec = (args["totalSec"] as? Int) ?? activity.attributes.totalSec

        let now = Date()
        let endsAt: Date
        let pausedRemaining: Int

        if isFinished {
          endsAt = now
          pausedRemaining = 0
        } else if isPaused {
          // Freeze: endsAt loses meaning while paused; we display pausedRemainingSec.
          let r = remainingSecOpt ?? max(0, Int(prev.endsAt.timeIntervalSince(now)))
          endsAt = now.addingTimeInterval(TimeInterval(r))
          pausedRemaining = r
        } else if let r = remainingSecOpt {
          // Resume / change duration: recompute endsAt.
          endsAt = now.addingTimeInterval(TimeInterval(r))
          pausedRemaining = r
        } else {
          endsAt = prev.endsAt
          pausedRemaining = prev.pausedRemainingSec
        }

        let newState = RestTimerAttributes.ContentState(
          endsAt: endsAt,
          startedAt: prev.startedAt,
          isFinished: isFinished,
          isPaused: isPaused,
          pausedRemainingSec: pausedRemaining
        )

        if #available(iOS 16.2, *) {
          await activity.update(
            ActivityContent(state: newState, staleDate: endsAt.addingTimeInterval(60))
          )
        }
        promise.resolve(nil)
      }
    }

    AsyncFunction("endActivity") { (args: [String: Any]?, promise: Promise) in
      let dismiss = (args?["dismiss"] as? Bool) ?? true
      Task {
        await Self.endAllActivities(dismiss: dismiss)
        Self.currentActivityID = nil
        promise.resolve(nil)
      }
    }
  }

  // MARK: - Helpers
  @available(iOS 16.2, *)
  private static func endAllActivities(dismiss: Bool) async {
    for activity in Activity<RestTimerAttributes>.activities {
      let policy: ActivityUIDismissalPolicy = dismiss ? .immediate : .default
      let finalState = activity.content.state
      await activity.end(
        ActivityContent(state: finalState, staleDate: nil),
        dismissalPolicy: policy
      )
    }
  }
}

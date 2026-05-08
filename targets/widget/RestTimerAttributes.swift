import ActivityKit
import Foundation

/// Shared attributes used by both the main app (to start/update activities)
/// and the Widget Extension (to render them).
public struct RestTimerAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    /// Absolute end time. SwiftUI's Text(timerInterval:) renders the countdown.
    public var endsAt: Date
    /// Absolute start time, for progress calculation.
    public var startedAt: Date
    /// True when the timer reached zero.
    public var isFinished: Bool
    /// True when the timer is paused (frozen).
    public var isPaused: Bool
    /// Remaining seconds when paused (only valid when isPaused == true).
    public var pausedRemainingSec: Int

    public init(
      endsAt: Date,
      startedAt: Date,
      isFinished: Bool = false,
      isPaused: Bool = false,
      pausedRemainingSec: Int = 0
    ) {
      self.endsAt = endsAt
      self.startedAt = startedAt
      self.isFinished = isFinished
      self.isPaused = isPaused
      self.pausedRemainingSec = pausedRemainingSec
    }
  }

  /// Athlete name shown in the activity.
  public var athleteName: String
  /// Total duration in seconds (for the progress bar denominator).
  public var totalSec: Int

  public init(athleteName: String, totalSec: Int) {
    self.athleteName = athleteName
    self.totalSec = totalSec
  }
}

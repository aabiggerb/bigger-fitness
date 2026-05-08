// Symlink-equivalent copy of targets/widget/RestTimerAttributes.swift
// Both targets need to compile this struct so the app can encode states the
// widget can decode.

import ActivityKit
import Foundation

public struct RestTimerAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var endsAt: Date
    public var startedAt: Date
    public var isFinished: Bool
    public var isPaused: Bool
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

  public var athleteName: String
  public var totalSec: Int

  public init(athleteName: String, totalSec: Int) {
    self.athleteName = athleteName
    self.totalSec = totalSec
  }
}

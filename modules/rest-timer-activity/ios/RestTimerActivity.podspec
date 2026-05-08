Pod::Spec.new do |s|
  s.name           = 'RestTimerActivity'
  s.version        = '1.0.0'
  s.summary        = 'ActivityKit Live Activity bridge for the rest timer.'
  s.description    = 'Local Expo module exposing start/update/end Live Activity APIs to JavaScript.'
  s.author         = ''
  s.homepage       = 'https://github.com/aabiggerb/bigger-fitness'
  s.platforms      = { :ios => '16.2' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end

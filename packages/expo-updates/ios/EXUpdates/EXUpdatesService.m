// Copyright 2020-present 650 Industries. All rights reserved.

#import <EXUpdates/EXUpdatesService.h>
#import <ExpoModulesCore/EXUtilities.h>

#if __has_include(<EXUpdates/EXUpdates-Swift.h>)
#import <EXUpdates/EXUpdates-Swift.h>
#else
#import "EXUpdates-Swift.h"
#endif

NS_ASSUME_NONNULL_BEGIN

@implementation EXUpdatesService

EX_REGISTER_MODULE();

+ (const NSArray<Protocol *> *)exportedInterfaces
{
#if SUPPRESS_EXPO_UPDATES_SERVICE // used in Expo Go
  return @[];
#endif
  return @[@protocol(EXUpdatesModuleInterface)];
}

- (EXUpdatesConfig *)config
{
#if SUPPRESS_EXPO_UPDATES_SERVICE // used in Expo Go
  return nil;
#endif
  return EXUpdatesAppController.sharedInstance.config;
}

- (EXUpdatesDatabase *)database
{
  return EXUpdatesAppController.sharedInstance.database;
}

- (EXUpdatesSelectionPolicy *)selectionPolicy
{
  return EXUpdatesAppController.sharedInstance.selectionPolicy;
}

- (NSURL *)directory
{
  return EXUpdatesAppController.sharedInstance.updatesDirectory;
}

- (nullable EXUpdatesUpdate *)embeddedUpdate
{
  return [EXUpdatesEmbeddedAppLoader embeddedManifestWithConfig:self.config database:self.database];
}

- (nullable EXUpdatesUpdate *)launchedUpdate
{
  return EXUpdatesAppController.sharedInstance.launchedUpdate;
}

- (nullable NSDictionary *)assetFilesMap
{
  return EXUpdatesAppController.sharedInstance.assetFilesMap;
}

- (BOOL)isUsingEmbeddedAssets
{
  return EXUpdatesAppController.sharedInstance.isUsingEmbeddedAssets;
}

- (BOOL)isEmbeddedLaunch
{
  // True if the embedded update and its ID are not nil, and match
  // the ID of the launched update
  return [[self embeddedUpdate] updateId] != nil &&
  [[[self embeddedUpdate] updateId] isEqual:[[self launchedUpdate] updateId]];
}

- (BOOL)isStarted
{
  return EXUpdatesAppController.sharedInstance.isStarted;
}

- (BOOL)isEmergencyLaunch
{
  return EXUpdatesAppController.sharedInstance.isEmergencyLaunch;
}

- (BOOL)canRelaunch
{
  return EXUpdatesAppController.sharedInstance.isStarted;
}

- (void)requestRelaunchWithCompletion:(EXUpdatesAppRelaunchCompletionBlock)completion
{
  return [EXUpdatesAppController.sharedInstance requestRelaunchWithCompletion:completion];
}

- (void)resetSelectionPolicy
{
  return [EXUpdatesAppController.sharedInstance resetSelectionPolicyToDefault];
}

@end

NS_ASSUME_NONNULL_END

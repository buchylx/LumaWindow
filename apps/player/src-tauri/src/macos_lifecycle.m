#import <AppKit/AppKit.h>
#import <objc/runtime.h>

// Observe the scene window only. A foreground editor on another display must
// not stop an otherwise visible ambient scene. All callbacks run on main queue.
typedef void (*LMCallback)(void *, int);
@interface LMLifecycle : NSObject
@property(nonatomic, weak) NSWindow *window;
@property(nonatomic) void *context;
@property(nonatomic) LMCallback callback;
@property(nonatomic, strong) NSMutableArray *subscriptions;
- (void)watch:(NSNotificationCenter *)center name:(NSNotificationName)name object:(id)object event:(int)event;
@end

@implementation LMLifecycle
- (void)watch:(NSNotificationCenter *)center name:(NSNotificationName)name object:(id)object event:(int)event {
    __weak LMLifecycle *weakSelf = self;
    id token = [center addObserverForName:name object:object queue:NSOperationQueue.mainQueue usingBlock:^(NSNotification *note) {
        LMLifecycle *owner = weakSelf;
        if (!owner) return;
        int value = event;
        if (event == 10) value = (owner.window.occlusionState & NSWindowOcclusionStateVisible) ? 9 : 8;
        owner.callback(owner.context, value);
    }];
    [self.subscriptions addObject:@[center, token]];
}
- (void)dealloc {
    for (NSArray *item in self.subscriptions) [item[0] removeObserver:item[1]];
    if (self.callback) self.callback(self.context, 99);
}
@end

static char LMLifecycleKey;
bool lm_install_lifecycle(void *nativeWindow, void *context, LMCallback callback) {
    if (!NSThread.isMainThread || !nativeWindow) return false;
    NSWindow *window = (__bridge NSWindow *)nativeWindow;
    LMLifecycle *observer = [LMLifecycle new];
    observer.window = window;
    observer.context = context;
    observer.callback = callback;
    observer.subscriptions = [NSMutableArray new];
    NSNotificationCenter *workspace = NSWorkspace.sharedWorkspace.notificationCenter;
    NSNotificationCenter *local = NSNotificationCenter.defaultCenter;
    [observer watch:workspace name:NSWorkspaceWillSleepNotification object:nil event:0];
    [observer watch:workspace name:NSWorkspaceDidWakeNotification object:nil event:1];
    [observer watch:workspace name:NSWorkspaceScreensDidSleepNotification object:nil event:2];
    [observer watch:workspace name:NSWorkspaceScreensDidWakeNotification object:nil event:3];
    [observer watch:workspace name:NSWorkspaceSessionDidResignActiveNotification object:nil event:4];
    [observer watch:workspace name:NSWorkspaceSessionDidBecomeActiveNotification object:nil event:5];
    [observer watch:local name:NSWindowDidMiniaturizeNotification object:window event:6];
    [observer watch:local name:NSWindowDidDeminiaturizeNotification object:window event:7];
    [observer watch:local name:NSWindowDidChangeOcclusionStateNotification object:window event:10];
    [observer watch:local name:NSApplicationDidChangeScreenParametersNotification object:nil event:11];
    objc_setAssociatedObject(window, &LMLifecycleKey, observer, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    callback(context, window.isMiniaturized ? 6 : 7);
    callback(context, (window.occlusionState & NSWindowOcclusionStateVisible) ? 9 : 8);
    return true;
}

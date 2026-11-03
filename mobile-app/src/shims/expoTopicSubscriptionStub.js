/** Stub for Expo Go when native ExpoTopicSubscriptionModule is missing (FCM topics unused in this app). */
export default {
  addListener: () => {},
  removeListeners: () => {},
  subscribeToTopicAsync: async () => null,
  unsubscribeFromTopicAsync: async () => null,
};

// Utility to get or create a unique user ID stored in localStorage

const USER_ID_KEY = 'terra_user_id';

export const getUserId = () => {
  let userId = localStorage.getItem(USER_ID_KEY);
  
  if (!userId) {
    // Generate a unique ID
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(USER_ID_KEY, userId);
  }
  
  return userId;
};

export const clearUserId = () => {
  localStorage.removeItem(USER_ID_KEY);
};


const hostname = window.location.hostname; 

export const USER_API_URL = `http://${hostname}/api/users`;
export const QUESTION_API_URL = `http://${hostname}/api/questions`;
export const MATCHING_API_URL = `http://${hostname}/api/matches`;
export const COLLABORATION_API_URL = `http://${hostname}/api/collab`;

export const MATCHING_WS_URL = `ws://${hostname}/ws/matches`;
export const COLLABORATION_WS_URL = `ws://${hostname}/ws/sessions`;
export const CHAT_WS_URL = `ws://${hostname}/ws/chat`;
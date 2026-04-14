const hostname = window.location.hostname;
const protocol = window.location.protocol;
const wsProtocol = protocol === "https:" ? "wss" : "ws";

export const USER_API_URL = `${protocol}//${hostname}/api/users`;
export const QUESTION_API_URL = `${protocol}//${hostname}/api/questions`;
export const MATCHING_API_URL = `${protocol}//${hostname}/api/matches`;
export const COLLABORATION_API_URL = `${protocol}//${hostname}/api/collab`;

export const MATCHING_WS_URL = `${wsProtocol}://${hostname}/ws/matches`;
export const COLLABORATION_WS_URL = `${wsProtocol}://${hostname}/ws/sessions`;
export const CHAT_WS_URL = `${wsProtocol}://${hostname}/ws/chat`;
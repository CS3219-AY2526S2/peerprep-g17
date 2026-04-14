const { origin, protocol, host } = window.location;
const wsProtocol = protocol === "https:" ? "wss:" : "ws:";

export const USER_API_URL = `${origin}/api/users`;
export const QUESTION_API_URL = `${origin}/api/questions`;
export const MATCHING_API_URL = `${origin}/api/matches`;
export const COLLABORATION_API_URL = `${origin}/api/collab`;

export const MATCHING_WS_URL = `${wsProtocol}//${host}/ws/matches`;
export const COLLABORATION_WS_URL = `${wsProtocol}//${host}/ws/sessions`;
export const CHAT_WS_URL = `${wsProtocol}//${host}/ws/chat`;

/**
 * Centralized API endpoint configuration.
 *
 * All service base URLs are defined here so they can be changed
 * in a single place.
 */

export const USER_API_URL = "http://localhost:8081/api/users";
export const QUESTION_API_URL = "http://localhost:8080/api/questions";
export const MATCHING_API_URL = "http://localhost:8082/api/matches";
export const MATCHING_WS_URL = "ws://localhost:8082/ws/matches";
export const COLLABORATION_API_URL = "http://localhost:8083/api/sessions";
export const COLLABORATION_WS_URL = "ws://localhost:8083/ws/sessions";
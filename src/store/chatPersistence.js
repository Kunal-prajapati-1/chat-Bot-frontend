
const GUEST_CHATS_KEY = "guest-chats";

export function loadGuestChats() {
  try {
    const savedChats = localStorage.getItem(GUEST_CHATS_KEY);
    return savedChats ? JSON.parse(savedChats) : [];
  } catch (error) {
    console.error("Unable to load guest chats:", error);
    return [];
  }
}

export function saveGuestChats(chats) {
  try {
    localStorage.setItem(GUEST_CHATS_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error("Unable to save guest chats:", error);
  }
}

export function clearGuestChats() {
  localStorage.removeItem(GUEST_CHATS_KEY);
}

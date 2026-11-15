
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export async function createGuestSession() {
  const response = await axios.post(
    `${API_URL}/auth/guest`,
    {},
    { withCredentials: true }
  );

  return response.data.profile;
}

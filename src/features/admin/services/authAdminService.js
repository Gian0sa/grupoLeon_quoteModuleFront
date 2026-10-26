import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const updateProfileAdmin = async (profileData) => {
  console.log("profileData", profileData);
  const response = await axiosInstance.put(`/authModule/profile/admin/${profileData.userId}`, profileData);
  return response.data;
}

export const adminUsers = async () => {
  try {
    const response = await axiosInstance.get("/authModule/adminUsers");
    return response.data;
  } catch (error) {
    console.error("❌ Error en adminUsers (/authModule/adminUsers):", error?.response?.status, error?.response?.data || error.message);
    throw error;
  }
};

export const updateUserStatus = async ({ userId, active }) => {
  const response = await axiosInstance.put(
    `/authModule/user/status/${userId}`,
    { active }
  );
  return response.data;
};

export const unlockUser = async (userId) => {
  const response = await axiosInstance.put(`/authModule/user/unlock/${userId}`);
  return response.data;
};
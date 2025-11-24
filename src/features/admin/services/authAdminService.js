import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const updateProfileAdmin = async (profileData) => {
  console.log("profileData", profileData);
  const response = await axiosInstance.put(`/authModule/profile/admin/${profileData.userId}`, profileData);
  return response.data;
}

export const adminUsers = async () => {
  const response = await axiosInstance.get("/authModule/adminUsers");
  return response.data;
}

export const updateUserStatus = async ({ userId, active }) => {
  const response = await axiosInstance.put(
    `/authModule/user/status/${userId}`,
    { active }
  );
  return response.data;
};
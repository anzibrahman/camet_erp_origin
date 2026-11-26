import api from "../../../api/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import SecUserCreationForm from "../../../components/common/Forms/SecUserCreationForm";

function AddSecUsers() {
  const navigate = useNavigate();

  const submitHandler = async (formData) => {
    try {
      const res = await api.post("/api/sUsers/addSecUsers", formData, {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      });

      toast.success(res.data.message);
      navigate("/sUsers/retailers");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to register the secondary user.");
      console.log(error);
    }
  };

  return <SecUserCreationForm submitHandler={submitHandler} />;
}

export default AddSecUsers;

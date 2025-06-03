 import { useMutation } from "@tanstack/react-query"
 import { useQuoteStore } from "../../stores/quoteStore"
 import { useNavigate } from "react-router-dom"
 import { createQuote, updateQuote , uploadImage , deleteImage } from "../../services/quoteService"


 export function useQuoteMutations() {
    const { setPaymentImg } = useQuoteStore();
    const navigate = useNavigate()
    const createQuoteMutation = useMutation({
        mutationFn: createQuote,
        onSuccess: (data) => {
            console.log(data)
            useQuoteStore.getState().clear()
            navigate("/dashboard")
        },
        onError: (error) => {
            console.log(error)
        },
    })
    const updateQuoteMutation = useMutation({
        mutationFn: updateQuote,
        onSuccess: (data) => {
            console.log(data)
            useQuoteStore.getState().clear()
            navigate("/dashboard")
        },
        onError: (error) => {
            console.log(error)
        },
    })
    const uploadImageMutation = useMutation({
        mutationFn: uploadImage,
        onSuccess: (data)=>{
            setPaymentImg(data.imagePath);
            console.log(data)
        },
        onError: (error)=>{
            console.log(error)
        }
    })
    const deleteImageMutation = useMutation({
        mutationFn: deleteImage,
        onSuccess: (data)=>{
            setPaymentImg(data.imagePath);
            console.log(data)
        },
        onError: (error)=>{
            console.log(error)
        }
    })
    return { createQuoteMutation, updateQuoteMutation , uploadImageMutation , deleteImageMutation }
}
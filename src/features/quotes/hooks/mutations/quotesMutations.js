 import { useMutation } from "@tanstack/react-query"
 import { useQuoteStore } from "../../stores/quoteStore"
 import { useNavigate } from "react-router-dom"
 import { createQuoteDraft, updateQuoteDraft, createConfirmedQuote , uploadImage , deleteImage } from "../../services/quoteService"


 export function useQuoteMutations() {
    const { setPaymentImg } = useQuoteStore();
    const navigate = useNavigate()
    const createQuoteDraftMutation = useMutation({
        mutationFn: createQuoteDraft,
        onSuccess: (data) => {
            console.log(data)
            useQuoteStore.getState().clear()
            navigate("/dashboard")
        },
        onError: (error) => {
            console.log(error)
        },
    })
    const updateQuoteDraftMutation = useMutation({
        mutationFn: updateQuoteDraft,
        onSuccess: (data) => {
            console.log(data)
            useQuoteStore.getState().clear()
            navigate("/dashboard")
        },
        onError: (error) => {
            console.log(error)
        },
    })
    const approveQuoteMutation = useMutation({
        mutationFn: createConfirmedQuote,
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
    return { createQuoteDraftMutation, updateQuoteDraftMutation, approveQuoteMutation , uploadImageMutation , deleteImageMutation }
}
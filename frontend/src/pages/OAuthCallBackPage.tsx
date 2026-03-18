import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"

export default function OAuthCallbackPage() {
  const navigate = useNavigate()
  const { loginWithToken } = useAuth()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")
    
    if (token) {
      loginWithToken(token)
      navigate("/dashboard")
    } else {
      navigate("/login")
    }
  }, [])

  return <p>Trying to login!</p>
}
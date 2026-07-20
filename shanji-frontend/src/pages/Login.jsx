import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

function Login(){

  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")
  const [error,setError] = useState("")


  async function handleLogin(e){

    e.preventDefault()

    const { error } = await signIn(email,password)

    if(error){
      setError(error.message)
      return
    }

    navigate("/role")
  }


  return(
    <div style={styles.container}>

      <form style={styles.card} onSubmit={handleLogin}>

        <h1>
          Shanji<span>DNA</span>
        </h1>

        <p>Project Operations System</p>

        {error && <p style={{color:"red"}}>{error}</p>}

        <input
          placeholder="Email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />

        <button>
          Sign In
        </button>

      </form>

    </div>
  )
}


const styles={
  container:{
    height:"100vh",
    display:"flex",
    justifyContent:"center",
    alignItems:"center"
  },

  card:{
    display:"flex",
    flexDirection:"column",
    gap:"15px",
    padding:"40px",
    width:"350px"
  }
}


export default Login
import { useNavigate } from "react-router-dom"

function RoleSelection(){

  const navigate = useNavigate()

  const roles = [
    "Administrator",
    "Project Manager",
    "Site Supervisor",
    "Finance",
    "Procurement",
    "M&E",
    "Team Member"
  ]


  return (

    <div style={styles.container}>

      <div style={styles.card}>

        <h1>Select Workspace Role</h1>

        <p>
          Choose how you want to access Shanji DNA
        </p>


        {roles.map(role => (

          <button
            key={role}
            style={styles.button}
            onClick={()=>navigate("/dashboard")}
          >
            {role}
          </button>

        ))}

      </div>

    </div>

  )
}


const styles = {

container:{
minHeight:"100vh",
display:"flex",
justifyContent:"center",
alignItems:"center"
},

card:{
display:"flex",
flexDirection:"column",
gap:"15px",
padding:"40px"
},

button:{
padding:"15px",
cursor:"pointer"
}

}


export default RoleSelection
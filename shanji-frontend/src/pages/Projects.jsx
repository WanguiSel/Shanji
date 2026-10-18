import { useEffect, useState } from "react"
import { supabase } from "../supabase"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"


function Projects(){

  const [projects,setProjects] = useState([])
  const navigate = useNavigate()
  const { user } = useAuth()
  const [name,setName] = useState("")
  const [saving,setSaving] = useState(false)
  const [error,setError] = useState("")
  const [loadError,setLoadError] = useState("")

  async function loadProjects(){
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at",{ascending:false})
    if(error){
      setLoadError(error.message)
      return
    }
    setLoadError("")
    setProjects(data || [])
  }

  async function handleAdd(e){
    e.preventDefault()
    if(saving) return
    setError("")
    const trimmed = name.trim()
    if(!trimmed){
      setError("Project name is required")
      return
    }
    if(!user){
      setError("You are not signed in. Please sign in again.")
      return
    }
    setSaving(true)
    const { data, error: insertError } = await supabase
      .from("projects")
      .insert({ project_name: trimmed, status: "Planning" })
      .select()
      .single()
    setSaving(false)
    if(insertError){
      // RLS rejections carry code 42501
      setError(
        insertError.code === "42501"
          ? "Permission denied by database policy: your account is not allowed to create projects (check your profile, role and organization). " + insertError.message
          : insertError.message
      )
      return
    }
    setName("")
    setProjects(prev => [data, ...prev])
  }


  useEffect(()=>{
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProjects()
  },[])



  return (

    <div>

      <h1>
        Projects
      </h1>

      <p>
        Project Portfolio Management
      </p>


      <form onSubmit={handleAdd} style={{display:"flex",gap:"10px",marginTop:"20px"}}>
        <input
          placeholder="New project name"
          value={name}
          onChange={(e)=>setName(e.target.value)}
        />
        <button disabled={saving}>
          {saving ? "Saving..." : "Add Project"}
        </button>
      </form>
      {error && <p style={{color:"red"}}>{error}</p>}
      {loadError && <p style={{color:"red"}}>Could not load projects: {loadError}</p>}

      <div style={styles.grid}>

        {projects.map(project=>(

          <div
            key={project.id}
            style={styles.card}
            onClick={()=>navigate(`/projects/${project.id}`)}
          >

            <h2>
              {project.project_name || "Unnamed Project"}
            </h2>

            <p>
              Status: {project.status || "Not set"}
            </p>

            <p>
              Progress: {project.progress || 0}%
            </p>

          </div>

        ))}

      </div>


      {projects.length === 0 && !loadError && (

        <p>
          No projects found.
        </p>

      )}


    </div>

  )

}



const styles={

grid:{
display:"grid",
gridTemplateColumns:"repeat(3,1fr)",
gap:"20px",
marginTop:"30px"
},

card:{
padding:"25px",
background:"#f5f5f5",
borderRadius:"12px",
cursor:"pointer"
}

}


export default Projects
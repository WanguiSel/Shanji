import { useEffect, useState } from "react"
import { supabase } from "../supabase"
import { useNavigate } from "react-router-dom"


function Projects(){

  const [projects,setProjects] = useState([])
  const navigate = useNavigate()


  useEffect(()=>{

    async function loadProjects(){

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at",{ascending:false})


      if(error){
        console.log(error)
        return
      }


      setProjects(data || [])

    }


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


      {projects.length === 0 && (

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
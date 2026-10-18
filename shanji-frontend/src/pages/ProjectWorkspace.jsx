import { useEffect, useState } from "react"
import { supabase } from "../supabase"
import { useNavigate, useParams } from "react-router-dom"

function ProjectWorkspace() {

  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [error, setError] = useState("")
  const [loaded, setLoaded] = useState(false)
  const back = () => navigate("/projects")

  const [risks, setRisks] = useState([])
  const [expenses, setExpenses] = useState([])
  const [milestones, setMilestones] = useState([])

  useEffect(() => {
  async function loadWorkspace() {

    const { data: proj, error: projError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (projError) {
      setError(projError.message)
      setLoaded(true)
      return
    }
    setProject(proj)
    setLoaded(true)
    if (!proj) return

    const { data: riskData } = await supabase
      .from("risks")
      .select("*")
      .eq("project_id", id)

    const { data: expenseData } = await supabase
      .from("expenses")
      .select("*")
      .eq("project_id", id)

    const { data: milestoneData } = await supabase
      .from("project_milestones")
      .select("*")
      .eq("project_id", id)

    setRisks(riskData || [])
    setExpenses(expenseData || [])
    setMilestones(milestoneData || [])
  }
    loadWorkspace()
  }, [id])


  if (!loaded) return <p>Loading project...</p>
  if (error) return <p style={{color:"red"}}>Could not load project: {error}</p>
  if (!project) return (
    <div>
      <p>Project not found, or you do not have access to it.</p>
      <button onClick={back}>← Back to Projects</button>
    </div>
  )

  return (
    <div style={styles.page}>

      <button onClick={back}>
        ← Back to Projects
      </button>


      <h1>{project.project_name}</h1>

      <div style={styles.cards}>

        <Card
          title="Health Score"
          value={`${project.health_score || 0}/100`}
        />

        <Card
          title="Progress"
          value={`${project.progress || 0}%`}
        />

        <Card
          title="Status"
          value={project.status}
        />

      </div>


      <section style={styles.section}>
        <h2>Execution</h2>

        <p>
          Milestones:
          {milestones.length}
        </p>

        <p>
          Risks:
          {risks.length}
        </p>

      </section>


      <section style={styles.section}>
        <h2>Financial Control</h2>

        <p>
          Expenses Recorded:
          {expenses.length}
        </p>

      </section>


      <section style={styles.section}>
        <h2>Operations</h2>

        <div>
          Workplans
        </div>

        <div>
          Documents
        </div>

        <div>
          Approvals
        </div>

        <div>
          Audit Trail
        </div>

      </section>


    </div>
  )
}


function Card({title,value}) {
  return (
    <div style={styles.card}>
      <h2>{value}</h2>
      <p>{title}</p>
    </div>
  )
}


const styles = {

page:{
padding:"40px",
background:"#F4F6F5",
minHeight:"100vh"
},

cards:{
display:"flex",
gap:"20px",
marginTop:"30px"
},

card:{
background:"white",
padding:"25px",
borderRadius:"15px"
},

section:{
background:"white",
padding:"25px",
marginTop:"25px",
borderRadius:"15px"
}

}


export default ProjectWorkspace
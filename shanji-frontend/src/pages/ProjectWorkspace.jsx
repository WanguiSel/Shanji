import { useEffect, useState } from "react"
import { supabase } from "../supabase"

function ProjectWorkspace({ project, back }) {

  const [risks, setRisks] = useState([])
  const [expenses, setExpenses] = useState([])
  const [milestones, setMilestones] = useState([])

  useEffect(() => {
    loadWorkspace()
  }, [])

  async function loadWorkspace() {

    const { data: riskData } = await supabase
      .from("risks")
      .select("*")
      .eq("project_id", project.id)

    const { data: expenseData } = await supabase
      .from("expenses")
      .select("*")
      .eq("project_id", project.id)

    const { data: milestoneData } = await supabase
      .from("project_milestones")
      .select("*")
      .eq("project_id", project.id)

    setRisks(riskData || [])
    setExpenses(expenseData || [])
    setMilestones(milestoneData || [])
  }


  return (
    <div style={styles.page}>

      <button onClick={back}>
        ← Back to Dashboard
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
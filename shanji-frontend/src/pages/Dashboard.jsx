import { useEffect, useState } from "react"
import { supabase } from "../supabase"


function Dashboard(){

  const [stats,setStats] = useState({
    projects:0,
    risks:0,
    approvals:0,
    expenses:0
  })


  useEffect(()=>{

    async function loadDashboard(){

      const { count: projects } = await supabase
        .from("projects")
        .select("*",{count:"exact",head:true})


      const { count: risks } = await supabase
        .from("risks")
        .select("*",{count:"exact",head:true})


      const { count: approvals } = await supabase
        .from("approvals")
        .select("*",{count:"exact",head:true})


      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount")


      const totalExpenses =
        expenses?.reduce(
          (sum,item)=>sum + Number(item.amount || 0),
          0
        ) || 0


      setStats({
        projects: projects || 0,
        risks: risks || 0,
        approvals: approvals || 0,
        expenses: totalExpenses
      })

    }


    loadDashboard()

  },[])



  const cards=[
    {
      title:"Projects",
      value:stats.projects
    },
    {
      title:"Open Risks",
      value:stats.risks
    },
    {
      title:"Pending Approvals",
      value:stats.approvals
    },
    {
      title:"Expenses",
      value:`KES ${stats.expenses}`
    }
  ]



return(

<div>

<h1>
Executive Dashboard
</h1>

<p>
Shanji DNA Project Operations Command Centre
</p>


<div style={styles.cards}>


{cards.map(card=>(

<div 
key={card.title}
style={styles.card}
>

<h3>{card.title}</h3>

<h1>{card.value}</h1>

</div>

))}


</div>


</div>

)

}



const styles={

cards:{
display:"grid",
gridTemplateColumns:"repeat(4,1fr)",
gap:"20px",
marginTop:"30px"
},

card:{
padding:"25px",
borderRadius:"12px",
background:"#f5f5f5"
}

}


export default Dashboard
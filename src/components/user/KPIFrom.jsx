import HeaderBar from "../reusable/HeaderBar";
import EmployeeHeaderCard from "../reusable/EmployeeHeaderCard";
import "./css/KPIForm.css";




export default  function KPIForm (){
    let KPIPoints=[
'Client Feedback while releasing from project.', 
'contribution for Company growth.', 
'Employee should initiate to take sesion on Saturday regarding topic which trainees have learned in that week.', 
'Employees need to inimate HR that they want to take session on that particular topic.', 
'Mail need to be shared regarding appreciation, shared by client to employee.', 
'Need to learn at least two new topic in year.', 
'Number of Leaves taken.', 
'Number of session they have took quarterly with proof(recording).', 
'Performance in Mock.', 
'Publishing blogs',
'Regularity, Availability and Attendance in Signiwis.', 
'Share document for the topic they have learn.',
'Should complete training on SAP UI5, SAP OData, SAP ABAP.',
'Should train minimum of two candidate.', 
]
    return (
        <div>
            <HeaderBar />
            <EmployeeHeaderCard
                empId="E123"
                name="John Doe"
                department="Engineering"
                email="john.doe@example.com"
                photoUrl="https://picsum.photos/seed/picsum/200/300"
            />
            <h2>KPI Form</h2>
            {/* Add your form fields and logic here */
            
                KPIPoints.map(items=>{
                    return (
                    <div className="kpi-from-row">
                        <label className="kpi-form-label">{items}</label>
                        <input className=".kpi-form-input" placeholder="1 to 10" />
                    </div>
                    )
                })
            }
        </div>
    );
}

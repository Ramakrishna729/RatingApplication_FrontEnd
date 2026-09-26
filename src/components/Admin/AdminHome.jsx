import HeaderBar from '../reusable/HeaderBar'
import EmployeeTable from './EmployeeTable'

function AdminHome(){
    return (
        <div>
            <HeaderBar></HeaderBar>
            <EmployeeTable></EmployeeTable>
        </div>
    ) 
}
export default AdminHome
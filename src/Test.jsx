import EmployeeHeaderCard from './components/reusable/EmployeeHeaderCard';

export default function Test() {


  return (
    <>
        <EmployeeHeaderCard
        empId="E123ssssssssssss"
        name="John Doe"
        department="Engineering"
        email="john.doe@example.com"
        photoUrl="https://picsum.photos/seed/picsum/200/300"
        />
    </>
  );
}

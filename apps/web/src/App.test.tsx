import{render,screen}from"@testing-library/react";import{describe,expect,it}from"vitest";import Login from"./Login";
describe("CareFlow web",()=>{it("shows demo login guidance",()=>{render(<Login onLogin={()=>{}}/>);expect(screen.getByText("Sign in to your workspace")).toBeInTheDocument();expect(screen.getByText(/admin@careflow.demo/)).toBeInTheDocument()})});

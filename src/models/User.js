export class User{
    constructor(
        {
            id,
            email,
            role
        }={})
        {
            this.id=id;
            this.email=email;
            this.role=role||'user';
        }
static fromRow(r){
    return new User(
        {
            id:r.id,
            email:r.email,
            role:r.role
        }
    );
}}

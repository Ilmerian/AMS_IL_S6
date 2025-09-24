export class Pitch{constructor({id,title,description,authorId,createdAt}={}){Object.assign(this,{id,title,description,authorId,createdAt});}
static fromRow(r){return new Pitch({id:r.id,title:r.title,description:r.description,authorId:r.author_id,createdAt:r.created_at});}}

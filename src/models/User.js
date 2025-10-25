export class User {
  constructor({
    id,
    username,
    email,
    avatarUrl,
    firstName,
    lastName,
  } = {}) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.avatarUrl = avatarUrl || null;
    this.firstName = firstName || null;
    this.lastName = lastName || null;
  }

  static fromRow(r) {
    if (!r) return null;
    return new User({
      id: r.user_id ?? r.id,
      username: r.username,
      email: r.email,
      avatarUrl: r.avatar_url,
      firstName: r.first_name,
      lastName: r.last_name,
    });
  }
}

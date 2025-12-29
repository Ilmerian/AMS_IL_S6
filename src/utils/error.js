/**
 * Erreur personnalisée de l'application
 */

export class AppError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code
    }
}

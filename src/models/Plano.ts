import { connection } from "../infra/Connection";
import { Assinatura } from "./Assinatura";
import { Usuario } from "./Usuario";

export class Plano {
    id?: number;
    nomePlano: string;
    valorMensal: string;
    armazenamentoGB: number;

    constructor({ id, nomePlano, valorMensal, armazenamentoGB }: { id?: number, nomePlano: string, valorMensal: string, armazenamentoGB: number }) {
        this.id = id;
        this.nomePlano = nomePlano;
        this.valorMensal = valorMensal;
        this.armazenamentoGB = armazenamentoGB;
    }

    static async listarPlanos() {
        const result = await connection.query(`
            SELECT id, nome, valorMensal, armazenamentoGB
            FROM Plano
            ORDER BY id;
        `);

        return result.rows.map((row: any) => ({
            id: row.id,
            nome: row.nome,
            descricao: `Armazenamento de ${row.armazenamentogb} GB`,
            valor: Number(row.valormensal).toFixed(2)
        }));
    }

    static async criarPlano(plano: Plano) {
        await connection.query(`INSERT INTO Plano(nome, valorMensal, armazenamentoGB) VALUES ($1, $2, $3);`, 
            [
                plano.nomePlano,
                plano.valorMensal,
                plano.armazenamentoGB
            ]
        );
    }

  static async buscarPlanoPorId(id: number | string): Promise<Plano | null> {
        const result = await connection.query(`
            SELECT id, nome, valorMensal, armazenamentoGB
            FROM Plano
            WHERE id = $1;
        `, [id]);

        if (result.rows.length === 0) {
            return null;
        }

        const row: any = result.rows[0];
        return new Plano({
            id: row.id,
            nomePlano: row.nome,
            valorMensal: Number(row.valormensal).toFixed(2),
            armazenamentoGB: row.armazenamentogb
        });
    }

    static async updatePlano(plano: Plano) {
        await connection.query(`
            UPDATE Plano
            SET nome = $1,
                valorMensal = $2,
                armazenamentoGB = $3
            WHERE id = $4;
        `, [
            plano.nomePlano,
            plano.valorMensal,
            plano.armazenamentoGB,
            plano.id
        ]);
    }

    static async deletarPlano(id: number | string): Promise<boolean> {
        try {
            const result = await connection.query(`
                DELETE FROM Plano p
                WHERE p.id = $1
                  AND NOT EXISTS (
                    SELECT 1 FROM Assinatura a WHERE a.fkPlano = p.id
                  )
                RETURNING p.id;
            `, [id]);

            return result.rowCount === 1;
        } catch (error) {
            if (
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === '23503'
            ) {
                return false;
            }

            throw error;
        }
    }

    static async assinarPlano(usuario: Usuario, plano: Plano, assinatura: Assinatura) {
        await connection.query(`INSERT INTO Assinatura(fkUsuario, fkPlano, dataInicio, dataFim) VALUES ($1, $2, $3, $4);`,
            [
                usuario.id,
                plano.id,
                assinatura.dataInicio,
                assinatura.dataFim
            ]
        );
    }

    static async cancelarAssinatura(usuario: Usuario) {
        await connection.query(`DELETE FROM Assinatura WHERE fkUsuario = $1`,
            [
                usuario.id
            ]
        );
    }
}
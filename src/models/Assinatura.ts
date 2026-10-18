import { connection } from "../infra/Connection";
import { Plano } from "./Plano";
import { Usuario } from "./Usuario";

export class Assinatura {
    id?: number;
    dataInicio: Date;
    dataFim: Date;
    dias: number;
    fkUsuario?: Usuario;
    fkPlano?: Plano;

    constructor({ id, dataInicio, dataFim, dias, fkUsuario, fkPlano }: { id?: number, dataInicio: Date, dataFim: Date, dias: number, fkUsuario?: Usuario, fkPlano?: Plano }) {
        this.id = id;
        this.dataInicio = dataInicio;
        this.dataFim = dataFim;
        this.dias = dias;
        this.fkUsuario = fkUsuario;
        this.fkPlano = fkPlano;
    }

//cadastro
    static async cadastrarAssinatura(assinatura: Assinatura) {
        await connection.query(`INSERT INTO Assinatura(dias, fkPlano) VALUES ($1, $2);`,
            [
                assinatura.dias,
                assinatura.fkPlano?.id
            ]
        );
    }

//calcular data fim
    static async calcularDataFim(dataInicio: Date, dias: number): Promise<Date> {
        if (dias < 30 || dias > 365) {
            throw new RangeError(`O período de Assinatura deve ser entre 30 e 365 dias.`);
        }

        const dataFim = new Date(dataInicio);
        dataFim.setDate(dataFim.getDate() + dias);
        return dataFim;
    }

    static async buscarAssinaturaPorDias(dias: number) {
        const { rows } = await connection.query(`SELECT * FROM Assinatura WHERE dias = $1;`,
        [dias]
        );
        if (!rows[0]) {
            return null;
        }
        return rows[0];
    }

}
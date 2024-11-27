import * as cheerio from "cheerio";
import { IRTrubuto } from "../interfaces/IR.interface";

/**
 * Função para buscar e processar as faixas de tributação do Imposto de Renda.
 * @returns {Promise<IRTrubuto[]>} Lista de faixas de tributação.
 */
async function tributacao(): Promise<IRTrubuto[]> {
  try {
    const currentYear = new Date().getFullYear();
    const url = `https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/${currentYear}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Erro ao buscar os dados: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const taxRates: IRTrubuto[] = [];
    $("table")
      .first()
      .find("tr")
      .each((_, row) => {
        const cols = $(row)
          .find("td")
          .map((_, col) => $(col).text().trim())
          .get();

        if (cols.length > 0) {
          const faixa = cols[0];
          const aliquota = cols[1];
          const deducao = cols[2];

          let faixaParsed = { min: 0, max: Infinity };
          if (faixa.includes("Até")) {
            faixaParsed.max = parseFloat(
              faixa
                .replace("Até R$", "")
                .replace(".", "")
                .replace(",", ".")
                .trim()
            );
          } else if (faixa.includes("De") && faixa.includes("até")) {
            const [min, max] = faixa
              .replace("De R$", "")
              .split("até R$")
              .map((value) =>
                parseFloat(value.replace(".", "").replace(",", ".").trim())
              );
            faixaParsed = { min, max };
          } else if (faixa.includes("Acima de")) {
            faixaParsed.min = parseFloat(
              faixa
                .replace("Acima de R$", "")
                .replace(".", "")
                .replace(",", ".")
                .trim()
            );
            faixaParsed.max = Infinity;
          }

          const aliquotaParsed = aliquota.includes("%")
            ? parseFloat(aliquota.replace("%", "").replace(",", ".").trim())
            : 0;

          const deducaoParsed = deducao.includes("R$")
            ? parseFloat(
                deducao
                  .replace("R$", "")
                  .replace(".", "")
                  .replace(",", ".")
                  .trim()
              )
            : 0;

          taxRates.push({
            faixa: faixaParsed,
            aliquota: aliquotaParsed,
            deducao: deducaoParsed,
          });
        }
      });

    return taxRates;
  } catch (error) {
    return [];
  }
}

export default { tributacao };

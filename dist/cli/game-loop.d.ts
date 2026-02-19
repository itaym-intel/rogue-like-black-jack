export interface CliGameOptions {
    seed?: number | string;
    startingBankroll?: number;
}
export declare function runCliGame(options?: CliGameOptions): Promise<void>;

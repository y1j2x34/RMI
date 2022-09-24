import ts from 'typescript';
export declare class ChannelProgramContext {
    private readonly typeChecker;
    constructor(typeChecker: ts.TypeChecker);
    channelMethodSymbol?: ts.Symbol;
    channelClassSymbol?: ts.Symbol;
    variablesMap: Map<ts.Type, ts.VariableDeclaration>;
    channel_variables: Set<ts.Symbol>;
    is_accessing_get_class_method(callExpression: ts.CallExpression, propertyExpression: ts.PropertyAccessExpression): boolean;
    recordChannelVariableByBinaryExpression(node: ts.BinaryExpression): void;
    recordChannelVariableIfPossible(node: ts.VariableDeclaration): void;
    private isChannelInstanceInitializerExpression;
    recordChannelSymbolIfPossible(node: ts.ImportDeclaration): void;
}

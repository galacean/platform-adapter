import { Node } from 'estree';

export enum ASTType {
  Other = 0,
  Class = 1,
  Function = 2,
}

export type NodeWrapper = Record<string, Node>

export type ASTNode = {
  type: string,
  node: {
    name: string,
    node: Node,
    astType: ASTType,
    members?: NodeWrapper
  }
}

export type ASTNodeWrapper = Record<string, ASTNode>

export default abstract class ASTParser {
  protected astNode: Node;
  protected astType: ASTType;

  public get type(): ASTType {
    return this.astType;
  }

  constructor(node: Node) {
    this.astNode = node;
  }

  parse(): ASTNodeWrapper {
    return undefined;
  }
}

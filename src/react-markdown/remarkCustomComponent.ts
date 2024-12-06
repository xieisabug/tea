import { visit } from "unist-util-visit";
import { Node } from "unist";

interface TextNode extends Node {
    type: "text";
    value: string;
}

interface Parent extends Node {
    children: Node[];
}

export default function remarkCustomCompenent() {
    return (tree: Node) => {
        visit(
            tree,
            "text",
            (node: TextNode, index: number | null, parent: Parent | null) => {
                const { value } = node;
                const match = value.match(/^@tips:(.*)/);

                if (match) {
                    const text = match[1].trim();

                    parent?.children.splice(index as number, 1, {
                        type: "tips",
                        data: {
                            hName: "TipsComponent",
                            hProperties: { text },
                        },
                    });
                }
            },
        );
    };
}

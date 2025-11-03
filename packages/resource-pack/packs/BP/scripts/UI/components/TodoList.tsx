import { Button, FunctionComponent, JSX, Panel, Text, useReducer } from '@bedrock-core/ui';
import { system } from '@minecraft/server';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

type TodoAction =
  | { type: 'add'; text: string }
  | { type: 'remove'; id: number }
  | { type: 'clear_completed' }
  | { type: 'complete_next' };

function todoReducer(state: Todo[], action: TodoAction): Todo[] {
  switch (action.type) {
    case 'add':
      return [...state, { id: system.currentTick, text: action.text, completed: false }];
    case 'remove':
      return state.filter(todo => todo.id !== action.id);
    case 'clear_completed':
      return state.filter(todo => !todo.completed);
    case 'complete_next': {
      const idx = state.findIndex(t => !t.completed);
      if (idx === -1) return state;
      const next = { ...state[idx], completed: true };

      return [...state.slice(0, idx), next, ...state.slice(idx + 1)];
    }
    default:
      return state;
  }
}

/**
 * TodoList - Demonstrates useReducer for complex state logic
 * Grid Position: Row 1, Column 3
 */
export const TodoList: FunctionComponent = (): JSX.Element => {
  const [todos, dispatch] = useReducer(todoReducer, []);

  // Derived state - computed directly, no useState/useEffect needed!
  const todoCount = todos.length;
  const completedCount = todos.filter(t => t.completed).length;
  const hasIncomplete = todoCount > completedCount;

  const addTodo = (): void => {
    dispatch({ type: 'add', text: `Task ${todos.length + 1}` });
  };

  const clearCompleted = (): void => {
    dispatch({ type: 'clear_completed' });
  };

  const completeTodo = (): void => {
    dispatch({ type: 'complete_next' });
  };

  // console.error(`Rendering TodoList with todos: ${JSON.stringify(todos)}`);

  return (
    <Panel width={192} height={290} x={414} y={10}>
      <Text width={192} height={20} x={10} y={10} value={'§l§bTodo List'} />
      <Text width={192} height={15} x={10} y={35} value={`Total: §e${todoCount}`} />
      <Text width={192} height={15} x={10} y={53} value={`Done: §a${completedCount}`} />

      <Button
        width={81}
        height={20}
        x={10}
        y={75}
        onPress={(): void => {
          addTodo();
        }}>
        <Text width={81} height={20} x={5} y={5} value={'§a+ Add'} />
      </Button>

      <Button
        width={81}
        height={20}
        x={101}
        y={75}
        enabled={completedCount > 0}
        onPress={(): void => {
          clearCompleted();
        }}>
        <Text width={81} height={20} x={5} y={5} value={'§cClear'} />
      </Button>

      <Button
        width={172}
        height={20}
        x={10}
        y={100}
        enabled={hasIncomplete}
        onPress={() => completeTodo()}>
        <Text width={172} height={20} x={5} y={5} value={'§9Complete next'} />
      </Button>

      <Panel width={172} height={150} x={10} y={130}>
        {todos.map((todo, index) => (
          <Text width={100} height={20} x={10} y={5 + index * 20} value={todo.completed ? `§7§m${todo.text}` : `§f${todo.text}`} />
        ))}
      </Panel>
    </Panel>
  );
};

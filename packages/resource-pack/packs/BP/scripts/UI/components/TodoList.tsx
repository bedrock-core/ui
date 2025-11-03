import { Button, FunctionComponent, JSX, Panel, Text, useReducer } from '@bedrock-core/ui';
import { system } from '@minecraft/server';

/**
 * ============================================================================
 * useReducer EXAMPLE - Todo List with Complex State
 * ============================================================================
 */

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

type TodoAction =
  | { type: 'add'; text: string }
  | { type: 'toggle'; id: number }
  | { type: 'remove'; id: number }
  | { type: 'clear_completed' };

function todoReducer(state: Todo[], action: TodoAction): Todo[] {
  switch (action.type) {
    case 'add':
      return [...state, { id: system.currentTick, text: action.text, completed: false }];
    case 'toggle':
      return state.map(todo => todo.id === action.id ? { ...todo, completed: !todo.completed } : todo);
    case 'remove':
      return state.filter(todo => todo.id !== action.id);
    case 'clear_completed':
      return state.filter(todo => !todo.completed);
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

  const addTodo = (): void => {
    dispatch({ type: 'add', text: `Task ${todos.length + 1}` });
  };

  const clearCompleted = (): void => {
    dispatch({ type: 'clear_completed' });
  };

  return (
    <Panel width={192} height={140} x={414} y={10}>
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
        onPress={(): void => {
          if (todos.length > 0) {
            dispatch({ type: 'toggle', id: todos[0].id });
          }
        }}>
        <Text width={172} height={20} x={5} y={5} value={'§9Toggle First'} />
      </Button>
    </Panel>
  );
};

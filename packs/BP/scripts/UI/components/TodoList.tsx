import { JSX, Panel, Text, Button, FunctionComponent, useReducer, useState, useEffect } from '@bedrock-core/ui';

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
      return [...state, { id: Date.now(), text: action.text, completed: false }];
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
  const [todoCount, setTodoCount] = useState(0);

  // Track todo count
  useEffect(() => {
    setTodoCount(todos.length);
    console.log(`[TodoList] Updated: ${todos.length} todos`);
  }, [todos]);

  const addTodo = (): void => {
    dispatch({ type: 'add', text: `Task ${todos.length + 1}` });
  };

  const clearCompleted = (): void => {
    dispatch({ type: 'clear_completed' });
  };

  const completedCount = todos.filter(t => t.completed).length;

  return (
    <Panel width={220} height={140} x={470} y={10}>
      <Text width={220} height={20} x={480} y={20} value={'§l§bTodo List'} />
      <Text width={220} height={15} x={480} y={45} value={`Total: §e${todoCount}`} />
      <Text width={220} height={15} x={480} y={63} value={`Done: §a${completedCount}`} />

      <Button
        width={100}
        height={20}
        x={480}
        y={85}
        onPress={(): void => {
          addTodo();
        }}>
        <Text width={100} height={20} x={530} y={89} value={'§a+ Add'} />
      </Button>

      <Button
        width={100}
        height={20}
        x={585}
        y={85}
        onPress={(): void => {
          clearCompleted();
        }}>
        <Text width={100} height={20} x={635} y={89} value={'§cClear'} />
      </Button>

      <Button
        width={205}
        height={20}
        x={480}
        y={110}
        onPress={(): void => {
          if (todos.length > 0) {
            dispatch({ type: 'toggle', id: todos[0].id });
          }
        }}>
        <Text width={205} height={20} x={582} y={114} value={'§9Toggle First'} />
      </Button>
    </Panel>
  );
};

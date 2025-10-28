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
    <Panel width={192} height={140} x={414} y={10}>
      <Text width={192} height={20} x={424} y={20} value={'§l§bTodo List'} />
      <Text width={192} height={15} x={424} y={45} value={`Total: §e${todoCount}`} />
      <Text width={192} height={15} x={424} y={63} value={`Done: §a${completedCount}`} />

      <Button
        width={81}
        height={20}
        x={424}
        y={85}
        onPress={(): void => {
          addTodo();
        }}>
        <Text width={81} height={20} x={429} y={90} value={'§a+ Add'} />
      </Button>

      <Button
        width={81}
        height={20}
        x={515}
        y={85}
        onPress={(): void => {
          clearCompleted();
        }}>
        <Text width={81} height={20} x={520} y={90} value={'§cClear'} />
      </Button>

      <Button
        width={172}
        height={20}
        x={424}
        y={110}
        onPress={(): void => {
          if (todos.length > 0) {
            dispatch({ type: 'toggle', id: todos[0].id });
          }
        }}>
        <Text width={172} height={20} x={429} y={115} value={'§9Toggle First'} />
      </Button>
    </Panel>
  );
};

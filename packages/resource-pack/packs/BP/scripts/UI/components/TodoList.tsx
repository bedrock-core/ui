import { Button, FunctionComponent, JSX, Panel, Text, useReducer } from '@bedrock-core/ui';
import { system } from '@minecraft/server';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

type TodoAction
  = | { type: 'add'; text: string }
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

      if (idx === -1) {
        return state;
      }

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
    <Panel width={'24%'} height={'64%'} x={'51%'} y={'2%'}>
      <Text width={'100%'} height={'7%'} x={'5%'} y={'3%'}>
        {'§l§bTodo List'}
      </Text>
      <Text width={'100%'} height={'5%'} x={'5%'} y={'12%'}>
        {`Total: §e${todoCount}`}
      </Text>
      <Text width={'100%'} height={'5%'} x={'5%'} y={'18%'}>
        {`Done: §a${completedCount}`}
      </Text>

      <Button
        width={'42%'}
        height={'7%'}
        x={'5%'}
        y={'26%'}
        onPress={(): void => {
          addTodo();
        }}
      >
        <Text width={'100%'} height={'100%'} x={'6%'} y={'25%'}>
          {'§a+ Add'}
        </Text>
      </Button>

      <Button
        width={'42%'}
        height={'7%'}
        x={'53%'}
        y={'26%'}
        enabled={completedCount > 0}
        onPress={(): void => {
          clearCompleted();
        }}
      >
        <Text width={'100%'} height={'100%'} x={'6%'} y={'25%'}>
          {'§cClear'}
        </Text>
      </Button>

      <Button
        width={'90%'}
        height={'7%'}
        x={'5%'}
        y={'34%'}
        enabled={hasIncomplete}
        onPress={() => completeTodo()}
      >
        <Text width={'100%'} height={'100%'} x={'3%'} y={'25%'}>
          {'§9Complete next'}
        </Text>
      </Button>

      <Panel width={'90%'} height={'52%'} x={'5%'} y={'45%'}>
        {todos.map((todo, index) => (
          <Text width={'100%'} height={'13%'} x={'6%'} y={`${3 + index * 13}%`}>
            {todo.completed ? `§7§m${todo.text}` : `§f${todo.text}`}
          </Text>
        ))}
      </Panel>
    </Panel>
  );
};
